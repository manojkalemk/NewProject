
BACKEND API DOCUMENTATION

PROJECT OVERVIEW
----------------
This project is a backend API built using Node.js, Express.js, and PostgreSQL.
It implements secure authentication using JWT and Refresh Tokens with role-based
access control (RBAC). The backend is Dockerized for easy setup and sharing.

TECH STACK
----------
- Node.js
- Express.js
- PostgreSQL
- JWT (JSON Web Tokens)
- bcrypt (password hashing)
- Docker & Docker Compose

FEATURES
--------
- JWT authentication with refresh tokens
- Role-based authorization (admin, user)
- Secure password hashing
- Full CRUD APIs
- Session management and logout
- Dockerized environment

ROLES & PERMISSIONS
-------------------
Admin:
- Full CRUD on all resources
- Can create users
- Can manage customers, companies, projects, admins

User:
- Can view/update own profile only

ENVIRONMENT VARIABLES
---------------------
Create a .env file (do not commit to git):

PORT=4000
PGHOST=localhost
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=your_db_name
PGPOOL_MAX=10
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7

AUTHENTICATION FLOW
-------------------
1. Login with email and password
2. Server returns:
   - Access Token (short-lived)
   - Refresh Token (long-lived)
3. Use Access Token for APIs
4. When Access Token expires, call refresh API
5. Logout revokes refresh token

AUTH APIs
---------
POST /auth/login
Request:
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "accessToken": "JWT_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "user": { "id": 1, "email": "user@example.com", "role": "user" }
}

POST /auth/refresh
Request:
{ "refreshToken": "REFRESH_TOKEN" }

Response:
{ "accessToken": "NEW_JWT_TOKEN" }

POST /auth/logout
Headers:
Authorization: Bearer ACCESS_TOKEN

Logout current session:
{ "refreshToken": "REFRESH_TOKEN" }

Logout all sessions:
{ "all": true }

AUTHORIZATION RULES
-------------------
- GET /users            -> Admin
- GET /users/:id        -> Self or Admin
- PATCH /users/:id      -> Self or Admin
- DELETE /users/:id     -> Admin
- /customers/*          -> Admin
- /company/*            -> Admin
- /cprojects/*          -> Admin
- /admin/*              -> Admin

USERS API
---------
POST /users (Admin only)
{
  "fname": "First",
  "lname": "Last",
  "email": "user@example.com",
  "phone": "9999999999",
  "cname": "Company",
  "pname": "Project",
  "department": "Department",
  "password": "password",
  "role": "user"
}

DATABASE TABLES (AUTH)
----------------------
users:
- id
- email
- password_hash
- role
- created_at

refresh_tokens:
- id
- user_id
- token
- expires_at
- created_at

DOCKER USAGE
------------
docker compose up --build -d
docker compose down
docker compose down -v

POSTMAN SCRIPTS
---------------
Login:
pm.environment.set("jwt_token", pm.response.json().accessToken);
pm.environment.set("refresh_token", pm.response.json().refreshToken);

Refresh:
pm.environment.set("jwt_token", pm.response.json().accessToken);

Logout:
pm.environment.unset("jwt_token");
pm.environment.unset("refresh_token");

STATUS
------
Backend authentication, authorization, and CRUD APIs are complete.
Ready for frontend integration and deployment.