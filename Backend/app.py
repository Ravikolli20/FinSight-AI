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
# Enable CORS - in production, replace '*' with your actual domain
CORS(app)

@app.route("/", methods=["GET"])
def root():
    return {
        "status": "Backend is running",
        "service": "FinSight AI",
        "environment": "production"
    }

# --- Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
# Use environment variables in production; fallback to local for dev
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or \
    'sqlite:///' + os.path.join(basedir, 'finance.db')
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
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "syncToken": self.sync_token
        }

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
            "id": self.id,
            "accountId": self.account_id,
            "amount": self.amount,
            "description": self.description,
            "category": self.category,
            "date": self.date,
            "type": self.type,
            "method": self.method
        }

# --- Utilities ---

def generate_token(user_id):
    payload = {
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
        'sub': user_id
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            # Assumes format "Bearer <token>"
            data = jwt.decode(token.split(" ")[1], app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['sub'])
            if not current_user:
                return jsonify({'error': 'Invalid token!'}), 401
        except Exception as e:
            return jsonify({'error': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- Routes ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"error": "User with this email already exists"}), 409
    
    hashed_pw = generate_password_hash(data.get('password'))
    new_token = f"SF-{uuid.uuid4().hex[:6].upper()}"
    
    new_user = User(
        name=data.get('name', 'New User'),
        email=data.get('email'),
        password_hash=hashed_pw,
        sync_token=new_token
    )
    
    db.session.add(new_user)
    db.session.flush()
    
    # Auto-create default account
    db.session.add(Account(user_id=new_user.id, name="Cash Wallet", icon="💰"))
    db.session.commit()
    
    token = generate_token(new_user.id)
    return jsonify({"user": new_user.to_dict(), "token": token}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=data.get('email')).first()
    if user and check_password_hash(user.password_hash, data.get('password')):
        token = generate_token(user.id)
        return jsonify({"user": user.to_dict(), "token": token}), 200
    
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/accounts', methods=['GET'])
@token_required
def get_accounts(current_user):
    accounts = Account.query.filter_by(user_id=current_user.id).all()
    return jsonify([a.to_dict() for a in accounts])

@app.route('/api/accounts', methods=['POST'])
@token_required
def add_account(current_user):
    data = request.json
    if not data.get('name'):
        return jsonify({"error": "Account name is required"}), 400
        
    new_acc = Account(
        user_id=current_user.id,
        name=data.get('name'),
        icon=data.get('icon', '💼')
    )
    db.session.add(new_acc)
    db.session.commit()
    return jsonify(new_acc.to_dict()), 201

@app.route('/api/transactions', methods=['GET'])
@token_required
def get_transactions(current_user):
    transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()
    return jsonify([t.to_dict() for t in transactions])

@app.route('/api/transactions', methods=['POST'])
@token_required
def add_transaction(current_user):
    data = request.json
    # Validation
    if not data.get('accountId') or not data.get('amount'):
        return jsonify({"error": "Missing transaction data"}), 400
    
    new_tx = Transaction(
        user_id=current_user.id,
        account_id=data.get('accountId'),
        amount=float(data.get('amount')),
        description=data.get('description', 'No description'),
        category=data.get('category', 'Other'),
        date=data.get('date', datetime.utcnow().strftime('%Y-%m-%d')),
        type=data.get('type', 'expense'),
        method=data.get('method', 'cash')
    )
    db.session.add(new_tx)
    db.session.commit()
    return jsonify({"id": new_tx.id}), 201

@app.route('/api/transactions', methods=['DELETE'])
@token_required
def delete_transaction(current_user):
    tx_id = request.args.get('id')
    tx = Transaction.query.filter_by(id=tx_id, user_id=current_user.id).first()
    if not tx:
        return jsonify({"error": "Transaction not found"}), 404
    db.session.delete(tx)
    db.session.commit()
    return jsonify({"success": True})

# Create tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
