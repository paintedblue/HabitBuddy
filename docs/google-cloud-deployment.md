# Google Cloud deployment

This API is designed to run on Cloud Run with Cloud SQL PostgreSQL and Redis.
The web and Android apps should call the Cloud Run HTTPS URL, not localhost.

## 1. Create project and enable APIs

```sh
gcloud projects create <GCP_PROJECT_ID>
gcloud config set project <GCP_PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com redis.googleapis.com vpcaccess.googleapis.com
```

## 2. Create infrastructure

```sh
gcloud artifacts repositories create habit-buddy --repository-format=docker --location=asia-northeast3
gcloud sql instances create habit-buddy-postgres --database-version=POSTGRES_16 --region=asia-northeast3 --tier=db-f1-micro
gcloud sql databases create habit_buddy --instance=habit-buddy-postgres
gcloud sql users create habit_buddy --instance=habit-buddy-postgres --password=<DB_PASSWORD>
gcloud compute networks vpc-access connectors create habit-buddy-connector --region=asia-northeast3 --range=10.8.0.0/28
gcloud redis instances create habit-buddy-redis --size=1 --region=asia-northeast3 --redis-version=redis_7_0
gcloud storage buckets create gs://<AUDIO_BUCKET_NAME> --location=asia-northeast3 --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding gs://<AUDIO_BUCKET_NAME> --member=allUsers --role=roles/storage.objectViewer
```

Apply the schema once:

```sh
gcloud sql connect habit-buddy-postgres --user=habit_buddy --database=habit_buddy
\i infra/schema.sql
```

## 3. Store secrets

```sh
printf '%s' '<OPENAI_API_KEY>' | gcloud secrets create OPENAI_API_KEY --data-file=-
printf '%s' '<SUNO_API_KEY>' | gcloud secrets create SUNO_API_KEY --data-file=-
printf '%s' 'postgresql://habit_buddy:<DB_PASSWORD>@/habit_buddy?host=/cloudsql/<GCP_PROJECT_ID>:asia-northeast3:habit-buddy-postgres' | gcloud secrets create DATABASE_URL --data-file=-
printf '%s' 'redis://<REDIS_HOST>:6379' | gcloud secrets create REDIS_URL --data-file=-
```

## 4. Build and deploy

Grant the Cloud Run runtime service account permission to upload generated audio:

```sh
gcloud storage buckets add-iam-policy-binding gs://<AUDIO_BUCKET_NAME> \
  --member=serviceAccount:<CLOUD_RUN_SERVICE_ACCOUNT> \
  --role=roles/storage.objectCreator
```

```sh
gcloud builds submit --config cloudbuild.yaml --substitutions=_REGION=asia-northeast3,_SERVICE_NAME=habit-buddy-api,_ARTIFACT_REPOSITORY=habit-buddy,_CLOUD_SQL_INSTANCE=<GCP_PROJECT_ID>:asia-northeast3:habit-buddy-postgres,_VPC_CONNECTOR=habit-buddy-connector,_PUBLIC_API_BASE_URL=https://<CLOUD_RUN_URL>,_AUDIO_BUCKET_NAME=<AUDIO_BUCKET_NAME>,_AUDIO_PUBLIC_BASE_URL=https://storage.googleapis.com/<AUDIO_BUCKET_NAME>
```

If the Cloud Run URL changes after the first deploy, update the public URL and Suno callback:

```sh
gcloud run services update habit-buddy-api \
  --region=asia-northeast3 \
  --update-env-vars=PUBLIC_API_BASE_URL=https://<CLOUD_RUN_URL>,SUNO_CALLBACK_URL=https://<CLOUD_RUN_URL>/songs/callbacks/suno,AUDIO_BUCKET_NAME=<AUDIO_BUCKET_NAME>,AUDIO_PUBLIC_BASE_URL=https://storage.googleapis.com/<AUDIO_BUCKET_NAME>
```

## 5. Point apps to the deployed API

Set these values before web or Android builds:

```env
VITE_API_URL=https://<CLOUD_RUN_URL>
VITE_NATIVE_API_URL=https://<CLOUD_RUN_URL>
VITE_PUBLIC_API_BASE_URL=https://<CLOUD_RUN_URL>
PUBLIC_API_BASE_URL=https://<CLOUD_RUN_URL>
AUDIO_BUCKET_NAME=<AUDIO_BUCKET_NAME>
AUDIO_PUBLIC_BASE_URL=https://storage.googleapis.com/<AUDIO_BUCKET_NAME>
```

## 6. Smoke checks

```sh
curl -f https://<CLOUD_RUN_URL>/health
curl -f https://<CLOUD_RUN_URL>/reference-melodies/princess_bgm_cut.mp3 -o /tmp/princess_bgm_cut.mp3
npm --workspace apps/api run smoke:live-song
```

The live song smoke test requires valid OpenAI and Suno keys and may create a billable Suno task.
