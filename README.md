# De Anza Treemap

A web application for visualizing and managing tree data on the De Anza campus. Built with Django and PostGIS, this application provides an interactive map interface to explore trees on campus.

<<<<<<< Updated upstream
=======
## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
  - [Using Docker (Recommended)](#using-docker-recommended)
  - [Local Development Setup](#local-development-setup)
- [Importing Tree Data](#importing-tree-data)
- [API Endpoints](#api-endpoints)
- [Development and Production Environments](#development-and-production-environments)
- [Custom User Model](#custom-user-model)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Production Deployment Considerations](#production-deployment-considerations)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

>>>>>>> Stashed changes
## Features

- Interactive map visualization of tree data
- Detailed tree information display
- REST API for accessing tree data
- Tree data import from CSV files
- User authentication and permission management

## Tech Stack

- **Backend**: Django 5.1.6
- **Database**: PostgreSQL + PostGIS (for spatial data)
- **API**: Django REST Framework
- **Frontend**: JavaScript, Leaflet.js (map library)
- **Deployment**: Docker, Docker Compose

## Project Structure

The project consists of the following main apps:

<<<<<<< Updated upstream
- **trees**: Models and views for tree data management
- **users**: Custom user account and profile management
=======
```
DATreeMap-test/
├── config/                 # Django project settings
│   ├── settings.py         # Project settings file
│   ├── urls.py             # URL routing
│   └── wsgi.py             # WSGI configuration
├── trees/                  # Tree data app
│   ├── management/         # Django management commands
│   │   └── commands/       # Custom commands
│   │       ├── import_trees.py  # Tree data import
│   │       └── wait_for_db.py   # DB connection wait
│   ├── models.py           # Data models
│   ├── views.py            # View functions
│   └── urls.py             # URL routing
├── users/                  # User management app
├── static/                 # Static files
├── templates/              # HTML templates
├── Dockerfile              # Docker image configuration
├── docker-compose.yml      # Docker services setup
├── docker-compose.prod.yml # Production Docker setup
├── pyproject.toml          # Python dependency management
├── poetry.lock             # Poetry dependency lock file
├── start.sh                # Startup script
└── .env                    # Environment variables
```
>>>>>>> Stashed changes

## Installation and Setup

### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd [repository-folder]
   ```

2. Start services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application in your web browser:
   ```
   http://localhost:8000
   ```

### Local Development Setup

1. Install system dependencies:
   - Python 3.12
   - PostgreSQL with PostGIS extension
   - GDAL and GEOS libraries

2. Install Python dependencies using Poetry:
   ```bash
   pip install poetry
   poetry install
   ```

3. Configure database settings:
   ```bash
   export DB_NAME=datreemap
   export DB_USER=theo
   export DB_PASSWORD=your_password
   export DB_HOST=localhost
   export DB_PORT=5432
   ```

4. Run database migrations:
   ```bash
   python manage.py migrate
   ```

5. Start the development server:
   ```bash
   python manage.py runserver
   ```

## Importing Tree Data

A custom management command is provided to import tree data from CSV files:

```bash
python manage.py import_trees path/to/trees.csv
```

## API Endpoints

- Tree list: `/trees/api/rest/trees/`
- Tree detail: `/trees/api/rest/trees/<tag_number>/`
- Map tree data: `/trees/api/trees/`
- Tree detail data: `/trees/api/trees/<tag_number>/`

## Development and Production Environments

- Development: `config/settings.py`
- Production: Use `docker-compose.prod.yml` with appropriate environment variables

## Custom User Model

The project implements a custom user model with fields for:
- Profile picture
- Name
- Contributor status
- Gender
- Language preferences

## Environment Variables

Key environment variables:
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: Database connection details
- `ALLOWED_HOSTS`: Allowed host domains
- `IN_DOCKER`: Flag to determine Docker environment (for GDAL/GEOS library path settings)

## Production Deployment Considerations

For production deployment:
- Set `DEBUG=False`
- Configure a secure `SECRET_KEY`
- Use HTTPS
- Set up proper static file serving
- Apply security settings (HSTS, XSS protection, etc.)

## Running Tests

```bash
python manage.py test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add License Information]

---

This project is a web application utilizing Geographic Information Systems to visualize and manage tree data across the De Anza campus. 