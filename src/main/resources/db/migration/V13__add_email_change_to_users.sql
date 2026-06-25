ALTER TABLE users
    ADD COLUMN pending_email                 VARCHAR(255),
    ADD COLUMN email_verification_token      VARCHAR(255),
    ADD COLUMN email_verification_expires_at TIMESTAMP WITH TIME ZONE;
