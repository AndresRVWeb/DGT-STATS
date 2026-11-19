#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 Desplegando ARV AutoMetrics en Docker"
echo "=================================================="

# 1. Asegurar archivo .env
if [ ! -f .env ]; then
  echo "📄 Creando archivo .env desde .env.example..."
  cp .env.example .env
fi

# 2. Descargar últimas imágenes y compilar contenedores
echo "📦 Compilando y levantando contenedores con Docker Compose..."
docker compose pull || true
docker compose up -d --build

# 3. Esperar a que la app esté lista
echo "⏳ Verificando estado del servidor..."
sleep 5

for i in {1..12}; do
  if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo ""
    echo "=================================================="
    echo "✅ ARV AutoMetrics está levantado y saludable en el puerto 3000!"
    echo "=================================================="
    curl -s http://localhost:3000/api/health
    echo ""
    exit 0
  fi
  echo -n "."
  sleep 2
done

echo ""
echo "⚠️ La aplicación está tardando en responder. Revisa los logs con: docker compose logs -f"
