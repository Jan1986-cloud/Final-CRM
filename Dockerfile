FROM python:3.11-slim-bullseye

WORKDIR /app

COPY backend/src/requirements.txt requirements.txt
RUN pip install --upgrade pip
RUN pip install --upgrade pip

COPY backend/src /app/src

CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
