FROM public.ecr.aws/docker/library/python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
COPY rds-ca-bundle.pem /app/rds-ca-bundle.pem
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
