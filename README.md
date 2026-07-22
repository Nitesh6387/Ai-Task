# AI Task Platform

An AI Task Processing Platform built with the MERN Stack, Redis, BullMQ, Docker, and Kubernetes-ready deployment.

## Architecture

```
Frontend (React/Vite, served via nginx)
         │
         ▼
Backend API (Express) ──────► MongoDB (tasks, users)
         │
         │ enqueues job
         ▼
    Redis (BullMQ queue)
         │
         │ worker picks up job
         ▼
Worker (Node process) ──────► MongoDB (updates task status/result)
```

### Components

- **Backend API**: Express.js REST API handling authentication (JWT) and task CRUD operations. Tasks are enqueued to Redis/BullMQ for async processing.
- **Worker**: Separate Node.js process that consumes tasks from the BullMQ queue, performs text operations (uppercase, lowercase, reverse, wordcount), and updates task status/results in MongoDB.
- **Redis**: Message broker backing the BullMQ task queue.
- **MongoDB**: Primary database storing users and tasks with indexed queries.
- **Frontend**: React.js SPA with authentication, task creation, real-time status updates, and execution logs.

## Tech Stack

| Component       | Technology                       |
|-----------------|----------------------------------|
| Frontend        | React.js (Vite)                  |
| Backend API     | Node.js + Express.js             |
| Background Worker | Node.js + BullMQ               |
| Database        | MongoDB                          |
| Queue           | Redis + BullMQ                   |
| Authentication  | JWT                              |
| Containerization| Docker + Docker Compose          |
| Orchestration   | Kubernetes (k3s compatible)      |

## Features

- ✅ User Registration & Login with JWT authentication
- ✅ Password hashing using bcrypt
- ✅ Create AI processing tasks with title, input text, and operation type
- ✅ Supported operations: Uppercase, Lowercase, Reverse String, Word Count
- ✅ Asynchronous task processing via Redis/BullMQ queue
- ✅ Real-time task status tracking (Pending → Running → Completed/Failed)
- ✅ Execution logs for each task
- ✅ Pagination and status filtering
- ✅ Security: Helmet middleware, API rate limiting, no hardcoded secrets
- ✅ Multi-stage Docker builds running as non-root user
- ✅ Docker Compose for local development
- ✅ Kubernetes deployment manifests included as a starting point for deployment.
- ✅ Argo CD GitOps deployment support

## Running with Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/Nitesh6387/Ai-Task.git
cd Ai-Task

# Start all services
docker compose up --build
```

This starts five containers: `mongodb`, `redis`, `backend`, `worker`, `frontend`.

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost       |
| Backend  | http://localhost:5000  |
| MongoDB  | localhost:27017        |
| Redis    | localhost:6379         |

## Running Locally without Docker

### Prerequisites
- Node.js 20+
- MongoDB running locally (or remote URI)
- Redis running locally (or remote URL)

### Setup

```bash
# 1. Backend
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev          # Starts API on :5000

# 2. Worker (separate terminal)
cd backend
npm run worker       # Starts BullMQ worker

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables (backend/.env)

| Variable     | Description            | Example                                  |
|--------------|------------------------|------------------------------------------|
| `PORT`       | API port               | `5000`                                   |
| `MONGODB_URI`| MongoDB connection     | `mongodb://localhost:27017/task-platform`|
| `REDIS_URL`  | Redis connection       | `redis://localhost:6379`                 |
| `JWT_SECRET` | JWT signing secret     | (any random string)                      |
| `JWT_EXPIRE` | JWT expiration         | `7d`                                     |

## API Endpoints

### Authentication
| Method | Endpoint          | Description        | Auth Required |
|--------|-------------------|--------------------|---------------|
| POST   | `/api/auth/register` | Register user    | No            |
| POST   | `/api/auth/login`    | Login user       | No            |
| GET    | `/api/auth/me`       | Get current user | Yes           |

### Tasks
| Method | Endpoint       | Description          | Auth Required |
|--------|----------------|----------------------|---------------|
| POST   | `/api/tasks`   | Create a new task    | Yes           |
| GET    | `/api/tasks`   | Get user's tasks     | Yes           |
| GET    | `/api/tasks/:id` | Get single task    | Yes           |
| DELETE | `/api/tasks/:id` | Delete a task     | Yes           |

### Health
| Method | Endpoint        | Description    |
|--------|-----------------|----------------|
| GET    | `/api/health`   | Health check   |

## Task Lifecycle

`pending` → `running` (worker picked it up) → `completed` or `failed`

Each task keeps a `logs` array recording each transition, plus `startedAt`/`completedAt` timestamps and an `errorMessage` on failure. Failed jobs are retried automatically up to 3 times (exponential backoff) via BullMQ's `defaultJobOptions`.

## Docker Images

| Service   | Dockerfile                  | Base Image      |
|-----------|-----------------------------|-----------------|
| Backend   | `backend/Dockerfile`        | node:20-alpine  |
| Worker    | `backend/Dockerfile.worker` | node:20-alpine  |
| Frontend  | `frontend/Dockerfile`       | nginx:alpine    |

All containers run as a non-root user with multi-stage builds for optimized image sizes.

## Kubernetes Deployment

The project includes basic Kubernetes deployment manifests that can be used as a starting point for deployment.

The manifests include:

- Namespace
- Backend Deployment
- Worker Deployment
- Frontend Deployment
- Services
- ConfigMaps
- Secrets

## Planned GitOps with Argo CD
The project architecture is designed to support GitOps deployment using Argo CD. The following steps outline the intended deployment process:

1. Install Argo CD on your Kubernetes cluster
2. Configure the Application to point to the infrastructure repository
3. Enable Auto-Sync
4. The infrastructure repository contains all Kubernetes manifests

## Planned CI/CD Pipeline

The intended CI/CD pipeline would perform:

1. Run lint checks
2. Build Docker images
3. Push images to a container registry
4. Update deployment manifests

## Project Structure

```
Ai-Task/
├── backend/
│   ├── src/
│   │   ├── config/          # DB and Redis configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth middleware
│   │   ├── models/          # Mongoose schemas
│   │   ├── queue/           # BullMQ queue setup
│   │   ├── routes/          # Express routes
│   │   ├── server.js        # Express app entry
│   │   └── worker.js        # Background worker
│   ├── Dockerfile           # Backend container
│   ├── Dockerfile.worker    # Worker container
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios config
│   │   ├── components/      # React components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Page components
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # Entry point
│   ├── Dockerfile           # Frontend container
│   └── package.json
├── docker-compose.yml       # Local development
└── README.md
```


## Future Improvements

- Python-based background worker
- WebSocket-based live task updates
- Monitoring with Prometheus and Grafana
- Kubernetes production deployment
- CI/CD automation
- Argo CD GitOps deployment


## AI Assistance Disclosure

This project was designed, implemented, tested, and integrated by me as part of the assignment.

Due to the limited time available for the assignment, I used AI-assisted development tools as a productivity aid for selected tasks.

* Improving and formatting the project documentation (README and Architecture Document).
* Understanding Docker concepts and preparing initial Docker-related configurations.
* Assisting with debugging and clarifying implementation approaches during development.

All AI-generated suggestions were carefully reviewed, modified where necessary, tested, and integrated into the final project by me. I take full responsibility for the design, implementation, testing, and final submission of this project.


## Author

**Nitesh Verma**

GitHub: https://github.com/Nitesh6387

## License

MIT