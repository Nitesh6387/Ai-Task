# AI Task Platform — Architecture Document

## 1. Overall System Architecture

The AI Task Platform follows a microservices-inspired architecture with three main components: a React frontend, an Express.js backend API, and a Node.js background worker, all coordinated through Redis and MongoDB.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              React.js + Vite (served via nginx)              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON (REST API)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API (Express)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Auth     │  │ Task     │  │ Middle-  │  │ Rate       │  │
│  │ Routes   │  │ Routes   │  │ ware     │  │ Limiting   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└────────┬──────────────────────────────────────────┬─────────┘
         │                                          │
         ▼                                          ▼
┌─────────────────┐                    ┌──────────────────────┐
│    MongoDB      │                    │   Redis (BullMQ)     │
│  ┌───────────┐  │                    │  ┌────────────────┐  │
│  │  Users    │  │                    │  │ Task Queue     │  │
│  ├───────────┤  │                    │  └────────────────┘  │
│  │  Tasks    │  │                    └──────────┬───────────┘
│  └───────────┘  │                               │
└─────────────────┘                               │
                                                  ▼
                                   ┌──────────────────────────┐
                                   │   Worker (Node.js)        │
                                   │   BullMQ Consumer         │
                                   │   Concurrency: 5          │
                                   └──────────────────────────┘
```

### Data Flow

1. **User Authentication**: User registers/logs in → Backend validates credentials → JWT token issued → Stored in localStorage → Sent as Bearer token in subsequent requests.

2. **Task Creation**: User submits task form → Backend creates task document in MongoDB (status: `pending`) → Task ID pushed to Redis/BullMQ queue → Response returned immediately to user.

3. **Task Processing**: Worker picks up job from queue → Updates task status to `running` → Processes text operation → Updates task with result (status: `completed`) or error (status: `failed`) → Logs recorded at each step.

4. **Status Polling**: Frontend fetches tasks list with pagination → Displays current status → User can refresh individual task status.

## 2. Worker Scaling Strategy

The worker component is designed for horizontal scaling to handle varying workloads.

### Horizontal Scaling

- **Stateless Design**: Workers are stateless — all state is in MongoDB and Redis. Multiple worker instances can run concurrently.
- **BullMQ Concurrency**: Each worker instance processes up to 5 jobs concurrently (`concurrency: 5`).
- **Kubernetes HPA**: In production, a Horizontal Pod Autoscaler (HPA) can scale worker pods based on:
  - Queue depth (custom metrics via Prometheus)
  - CPU/Memory utilization
  - Job processing latency

### Scaling Formula

```
Number of Workers = (Tasks per second × Processing time per task) / Concurrency per worker
```

For 100,000 tasks/day (~1.16 tasks/second) with ~500ms average processing time:
```
Workers needed = (1.16 × 0.5) / 5 ≈ 0.12 → 1-2 workers minimum
```

For peak loads (10x), 2-4 workers would suffice.

## 3. Handling High Task Volume (100,000 tasks/day)

### Database Optimization

- **Indexed Queries**: Compound indexes on `{user: 1, status: 1}` and `{status: 1, createdAt: -1}` ensure efficient querying.
- **Pagination**: All list endpoints support cursor-based pagination with configurable page sizes.
- **TTL Indexes**: Consider adding TTL indexes for automatic cleanup of old/failed tasks.

### Queue Optimization

- **Job Deduplication**: BullMQ's `jobId` option prevents duplicate task processing.
- **Rate Limiting**: API rate limiting (100 requests/15 min per IP) prevents abuse.
- **Batch Processing**: For high throughput, tasks can be batched before queue insertion.

### Throughput Estimates

| Component     | Estimated Throughput | Bottleneck     |
|---------------|---------------------|----------------|
| Backend API   | 500+ req/s          | CPU-bound      |
| Redis Queue   | 10,000+ jobs/s      | Network I/O    |
| Worker (1 instance) | 50 tasks/s    | CPU-bound      |
| MongoDB       | 1,000+ writes/s     | Disk I/O       |

## 4. MongoDB Indexing Strategy

### Current Indexes

```javascript
// User collection
{ email: 1 }              // Unique index for login lookups

// Task collection
{ user: 1 }               // Filter tasks by user
{ status: 1 }             // Filter by status
{ status: 1, createdAt: -1 }  // Status-based queries sorted by date
{ user: 1, status: 1 }    // User's tasks filtered by status
```

### Recommended Additional Indexes

```javascript
// For high-volume scenarios
{ createdAt: -1 }         // TTL index for auto-cleanup (optional)
{ user: 1, createdAt: -1 } // User's tasks sorted by date
{ operationType: 1 }      // Analytics queries
```

### Index Design Principles

- **Equality first, then sort**: Indexes are ordered with equality fields first, then sort fields.
- **Covering queries**: Compound indexes that include all queried fields prevent document lookups.
- **Write performance**: Each index adds write overhead. For 100k tasks/day, current indexes are optimal.

## 5. Redis Failure Handling and Recovery

### Failure Scenarios

1. **Redis Connection Loss**: 
   - BullMQ automatically retries connection with exponential backoff.
   - Jobs remain in the queue and are processed when Redis recovers.
   - Backend API continues to accept requests but tasks remain in `pending` state.

2. **Redis Data Loss**:
   - BullMQ supports Redis persistence (RDB/AOF).
   - Jobs in-flight may be lost but can be re-queued.
   - Tasks in MongoDB with `pending` status can be re-enqueued via a recovery script.

3. **Worker Crash During Processing**:
   - BullMQ's automatic retry mechanism (3 attempts with exponential backoff).
   - Job is picked up by another worker instance.
   - Task status remains `running` — a heartbeat mechanism can detect stuck tasks.

### Recovery Strategy

```javascript
// Recovery script for re-queuing stuck tasks
const recoverStuckTasks = async () => {
  const stuckTasks = await Task.find({
    status: 'pending',
    createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5 min ago
  });
  
  for (const task of stuckTasks) {
    await addTaskJob(task._id.toString());
    task.logs.push({ message: 'Re-queued by recovery process' });
    await task.save();
  }
};
```

### High Availability Setup

- Redis Sentinel or Redis Cluster for automatic failover.
- Redis persistence enabled (AOF with fsync every second).
- Monitor Redis memory usage and set maxmemory-policy appropriately.

## 6. Deployment Strategy

### Staging Environment

```
┌─────────────────────────────────────────────┐
│           Staging Cluster (k3s)              │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Backend  │  │ Worker   │  │ Frontend │  │
│  │ (1 pod)  │  │ (1 pod)  │  │ (1 pod)  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  ┌──────────┐  ┌──────────┐                  │
│  │ MongoDB  │  │ Redis    │                  │
│  │ (1 pod)  │  │ (1 pod)  │                  │
│  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────┘
```

**Characteristics:**
- Single replica of each service
- Shared MongoDB/Redis (or lightweight instances)
- Auto-sync from staging branch via Argo CD
- Used for integration testing and QA

### Production Environment

```
┌─────────────────────────────────────────────────────┐
│              Production Cluster (k3s)                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Backend      │  │ Worker       │                 │
│  │ (2-3 pods)   │  │ (2-4 pods)   │                 │
│  │ HPA: CPU>70% │  │ HPA: Queue   │                 │
│  └──────────────┘  └──────────────┘                 │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Frontend     │  │ Ingress      │                 │
│  │ (2 pods)     │  │ Controller   │                 │
│  └──────────────┘  └──────────────┘                 │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ MongoDB      │  │ Redis        │                 │
│  │ (ReplicaSet) │  │ (Sentinel)   │                 │
│  └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

**Characteristics:**
- Multiple replicas for high availability
- Horizontal Pod Autoscaler for backend and worker
- MongoDB ReplicaSet for data redundancy
- Redis Sentinel for queue high availability
- Ingress with TLS termination
- Resource requests and limits configured
- Liveness and readiness probes for health checking
- Argo CD Auto-Sync from main branch

### GitOps Workflow

```
Developer pushes code → GitHub → CI/CD Pipeline:
  1. Lint check
  2. Build Docker images
  3. Push to Docker Hub
  4. Update image tags in infra repo
  5. Argo CD syncs changes to cluster
```

## Security Considerations

- **Password Hashing**: bcrypt with salt rounds of 12
- **JWT Authentication**: Tokens expire after 7 days
- **Helmet Middleware**: Sets secure HTTP headers
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **No Hardcoded Secrets**: All secrets via environment variables or Kubernetes Secrets
- **Non-root Containers**: All containers run as non-root user
- **Input Validation**: Operation type validation on server side

## Monitoring and Observability

- **Application Logs**: Structured logging with timestamps and levels
- **BullMQ Events**: Worker success/failure events logged
- **Health Endpoint**: `/api/health` for Kubernetes probes
- **MongoDB Monitoring**: Connection pool metrics, slow query logging
- **Redis Monitoring**: Memory usage, queue depth, hit rate

---

*Document Version: 1.0*
*Last Updated: July 2026*



## Limitations

- Background worker is implemented using Node.js instead of Python because of the assignment timeline.
- Kubernetes manifests are basic and can be extended for production deployment.
- Future work includes ArgoCD integration, CI/CD pipeline, monitoring, and WebSocket-based live updates.