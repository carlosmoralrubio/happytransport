#!/bin/bash
# Local development setup script

echo "📦 Setting up HappyTransport development environment..."

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found"; exit 1; }

# Create data directory
mkdir -p backend/data

# Install backend dependencies
echo "📦 Installing backend dependencies..."
pip install -r backend/requirements.txt

# Install frontend dependencies
if [ -d "frontend" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..
fi

echo "✅ Setup complete!"
echo ""
echo "🎉 To start development:"
echo "   docker-compose up"
echo ""
echo "   Or run locally:"
echo "   cd backend && uvicorn main:app --reload"
