# syntax=docker/dockerfile:1
# Use the official Python image from Docker Hub
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3002

CMD ["python", "src/main.py"]