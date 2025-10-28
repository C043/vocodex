Generic single-database configuration with an async dbapi.

## Setup
---
Everytime a database modification is needed, these are the steps:  
- Edit the model file in the codebase
- exec this command in the backend running container
```bash
sudo docker compose exec backend alembic revision --autogenerate -m "<database-modification>"

# Or if you want to do it from inside the container
sudo docker compose exec backend /bin/sh
alembic revision --autogenerate -m "<database-modification>"
```
- This should have created a new file in `/backend/migrations/versions/`, check if the sql in the new file is right
- If it's right, commit the new migration file, the next time the application starts, it will check the current database alembic revision and then scan the `versions` directory for all the versions files. It will then apply all the versions behind the one in the database.
- This will keep the database up to date. Keeping the `backend/migrations/versions/` files the only database source of truth
