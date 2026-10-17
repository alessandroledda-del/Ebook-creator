FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /var/data/generated
CMD ["sh","-c","gunicorn --workers 2 --threads 4 --timeout 180 --bind 0.0.0.0:${PORT:-5000} app:app"]
