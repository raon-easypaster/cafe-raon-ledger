#!/bin/zsh
# 카페 라온트리 회계장부 실행 스크립트

echo "🚀 카페 라온트리 회계장부를 시작합니다..."
PROJECT_DIR="/Users/galeb76/Documents/cafe-raon-ledger"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 프로젝트 폴더를 찾을 수 없습니다: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# node_modules가 없으면 설치
if [ ! -d "node_modules" ]; then
    echo "📦 필요한 패키지를 설치하고 있습니다. 잠시만 기다려주세요..."
    npm install
fi

# 브라우저 열기 (Vite 서버 실행 후 시도)
(sleep 3 && open "http://localhost:5173") &

# 개발 서버 실행
npm run dev
