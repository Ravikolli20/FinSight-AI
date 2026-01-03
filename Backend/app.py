import os
import uuid
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# --- Production CORS Setup ---
# Set FRONTEND_URL in Render environment variables to your Vercel URL
CORS(
    app,
    origins=[os.environ.get("FRONTEND_URL")],
    supports_credentials=True
)


# --- Database Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))

# Render provides 'DATABASE_URL'. 
db_url = os.environ.get('DATABASE_URL')
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url or 'sqlite:///' + os.path.join(basedir, 'finance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'smart-finance-super-secret-key-123'

db = SQLAlchemy(app)

# --- Database Models ---

class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(200), nullable=False)
    sync_token = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "syncToken": self.sync_token}

class Account(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(10), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "icon": self.icon}

class Transaction(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    type = db.Column(db.String(10), nullable=False) 
    method = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            "id": self.id, "accountId": self.account_id, "amount": self.amount,
            "description": self.description, "category": self.category,
            "date": self.date, "type": self.type, "method": self.method
        }

# --- Auth Middleware ---

def generate_token(user_id):
    payload = {'exp': datetime.utcnow() + timedelta(days=7), 'iat': datetime.utcnow(), 'sub': user_id}
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token: return jsonify({'error': 'Token is missing!'}), 401
        try:
            token_val = token.split(" ")[1]
            data = jwt.decode(token_val, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['sub'])
            if not current_user: return jsonify({'error': 'User not found!'}), 401
        except Exception: return jsonify({'error': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- API Routes ---

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()}), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"error": "Email already registered"}), 409
    
    hashed_pw = generate_password_hash(data.get('password'))
    new_user = User(
        name=data.get('name', 'User'), 
        email=data.get('email'), 
        password_hash=hashed_pw, 
        sync_token=f"SF-{uuid.uuid4().hex[:6].upper()}"
    )
    db.session.add(new_user)
    db.session.flush()
    db.session.add(Account(user_id=new_user.id, name="Cash Wallet", icon="💰"))
    db.session.commit()
    return jsonify({"user": new_user.to_dict(), "token": generate_token(new_user.id)}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400
    user = User.query.filter_by(email=data.get('email')).first()
    if user and check_password_hash(user.password_hash, data.get('password')):
        return jsonify({"user": user.to_dict(), "token": generate_token(user.id)}), 200
    return jsonify({"error": "Invalid email or password"}), 401

@app.route('/api/accounts', methods=['GET', 'POST', 'DELETE'])
@token_required
def handle_accounts(current_user):
    if request.method == 'POST':
        data = request.json
        new_acc = Account(user_id=current_user.id, name=data['name'], icon=data.get('icon', '💼'))
        db.session.add(new_acc)
        db.session.commit()
        return jsonify(new_acc.to_dict()), 201
    
    if request.method == 'DELETE':
        acc_id = request.args.get('id')
        account = Account.query.filter_by(id=acc_id, user_id=current_user.id).first()
        if account:
            # Delete associated transactions first (Cascading)
            Transaction.query.filter_by(account_id=acc_id, user_id=current_user.id).delete()
            db.session.delete(account)
            db.session.commit()
            return jsonify({"success": True})
        return jsonify({"error": "Account not found"}), 404

    return jsonify([a.to_dict() for a in Account.query.filter_by(user_id=current_user.id).all()])

@app.route('/api/transactions', methods=['GET', 'POST', 'DELETE'])
@token_required
def handle_transactions(current_user):
    if request.method == 'POST':
        data = request.json
        new_tx = Transaction(
            user_id=current_user.id, 
            account_id=data['accountId'], 
            amount=float(data['amount']), 
            description=data['description'], 
            category=data['category'], 
            date=data['date'], 
            type=data['type'], 
            method=data['method']
        )
        db.session.add(new_tx)
        db.session.commit()
        return jsonify(new_tx.to_dict()), 201
    
    if request.method == 'DELETE':
        tx_id = request.args.get('id')
        tx = Transaction.query.filter_by(id=tx_id, user_id=current_user.id).first()
        if tx:
            db.session.delete(tx)
            db.session.commit()
            return jsonify({"success": True})
        return jsonify({"error": "Transaction not found"}), 404
        
    return jsonify([t.to_dict() for t in Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()])

# --- Server Start ---
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
