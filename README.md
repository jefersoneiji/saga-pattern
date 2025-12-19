# Saga Pattern 

This repository contains practical implementations of the **Saga Pattern**, showcasing different coordination styles commonly used in distributed systems and microservice architectures.

The goal of this project is to demonstrate **how sagas can be implemented in real systems**, including message-based communication using **RabbitMQ** and containerized local execution with **Docker Compose**.


## 📌 What is the Saga Pattern?

The Saga Pattern is a way to manage **distributed transactions** by breaking them into a sequence of local transactions.  
Each step has a corresponding **compensating action** that is executed if a later step fails.

This repository covers:
- **Choreographed sagas**
- **Orchestrated sagas**
- Message-driven coordination using **RabbitMQ**

## 📂 Repository Structure

```bash 
├── basic/
│ ├── choreographed.ts
│ └── orchestrated.ts
│
├── orchestrated/
│ ├── implementation/
│ ├── microservices/
│ │ ├── service-a/
│ │ ├── service-b/
│ │ └── service-c/
│ └── docker-compose.yml
│
└── README.md
```

## 📁 `basic/`

This folder contains **simplified examples** focused on learning the core concepts.

### Contents
- **Choreographed Saga**
  - Services react to events emitted by other services
  - No central coordinator
- **Orchestrated Saga**
  - A central orchestrator controls the flow
  - Explicit command and compensation handling

These examples are intentionally minimal to highlight **control flow, state transitions, and compensation logic**.

## 📁 `orchestrated/`

This folder contains a **more realistic orchestrated saga setup**, closer to what you would find in production systems.

### 📁 `implementation/`
- Core saga orchestrator logic
- Step execution and compensation flow
- Saga state management

### 📁 `microservices/`
- Individual microservices
- Each service has its own **RabbitMQ listener**
- Services react to commands and emit events back to the orchestrator

### 🐳 `docker-compose.yml`
- Spins up:
  - RabbitMQ
  - Orchestrator
  - All microservices
- Enables local end-to-end saga execution

## 🚀 Running the Orchestrated Example

```bash
docker compose up -d
```
## 🗄️ Database Setup

The orchestrator relies on a `sagas` table to persist saga state and execution progress.

Import the `saga_schema.sql` file into the postgresql container. 

To create the required table, run:

```bash
psql -U postgres -d sagas -f saga_schema.sql
```


## ▶️ Starting a Saga

To manually start a saga:

1. Navigate to the orchestrated implementation folder:
   ```bash
   cd orchestrated/implementation
   ```

2. Run the saga starter script:
   ```bash
   bun start-saga.ts
   ```
## License

MIT License.