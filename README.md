# Ebook Creator

## Project Documentation

### Features
- Create and manage ebooks effortlessly.
- Support for multiple ebook formats.
- User-friendly interface and setup.
- Import and export options for different formats.

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/alessandroledda-del/Ebook-creator.git
   cd Ebook-creator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application:
   ```bash
   npm start
   ```

### API Endpoints
- **GET** `/api/ebooks`
  - Description: Retrieve the list of ebooks.
- **POST** `/api/ebooks`
  - Description: Create a new ebook entry.
- **GET** `/api/ebooks/{id}`
  - Description: Get details of a specific ebook.
- **DELETE** `/api/ebooks/{id}`
  - Description: Delete a specific ebook.

### Deployment Guide
1. Build the application:
   ```bash
   npm run build
   ```
2. Deploy to your server of choice, e.g., AWS, Heroku.
3. Make sure to configure environment variables accordingly:
   - `DATABASE_URL=...`
   - `SECRET_KEY=...`

For more details and specific configurations refer to the `docs/DEPLOYMENT.md` file.