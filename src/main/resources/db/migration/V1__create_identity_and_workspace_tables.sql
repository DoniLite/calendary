create table users (
    id uuid primary key,
    email varchar(320) not null,
    password_hash varchar(255) not null,
    status varchar(64) not null,
    role varchar(64) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_users_status check (status in ('INVITED', 'ACTIVE', 'PASSWORD_CHANGE_REQUIRED', 'DISABLED')),
    constraint ck_users_role check (role in ('SUPER_ADMIN', 'COLLABORATOR'))
);

create unique index uk_users_email_lower on users (lower(email));

create table workspaces (
    id uuid primary key,
    name varchar(255) not null,
    type varchar(64) not null,
    owner_id uuid not null references users (id),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_workspaces_type check (type in ('PERSONAL'))
);

create index ix_workspaces_owner_id on workspaces (owner_id);

create table workspace_memberships (
    id uuid primary key,
    workspace_id uuid not null references workspaces (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    access_level varchar(64) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_workspace_memberships_access_level check (access_level in ('READ', 'WRITE', 'OWNER')),
    constraint uk_workspace_memberships_workspace_user unique (workspace_id, user_id)
);

create index ix_workspace_memberships_user_id on workspace_memberships (user_id);

create table invitations (
    id uuid primary key,
    email varchar(320) not null,
    token_hash varchar(64) not null,
    invited_by_id uuid not null references users (id),
    status varchar(64) not null,
    access_level varchar(64) not null,
    expires_at timestamp with time zone not null,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint uk_invitations_token_hash unique (token_hash),
    constraint ck_invitations_status check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    constraint ck_invitations_access_level check (access_level in ('READ', 'WRITE', 'OWNER'))
);

create index ix_invitations_email_lower on invitations (lower(email));
create index ix_invitations_invited_by_id on invitations (invited_by_id);
