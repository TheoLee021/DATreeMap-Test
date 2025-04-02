# De Anza Treemap

A web application for visualizing and managing tree data on the De Anza campus. Built with Django and PostGIS, this application provides an interactive map interface to explore trees on campus.

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

- **trees**: Models and views for tree data management
- **users**: Custom user account and profile management

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