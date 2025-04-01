#!/bin/bash

# 데이터베이스 마이그레이션 실행
python manage.py migrate

# 정적 파일 수집
python manage.py collectstatic --noinput

# Nginx 시작
service nginx start

# Django 애플리케이션 실행
python manage.py runserver 0.0.0.0:8000