create table projects (
    id uuid primary key,
    workspace_id uuid not null references workspaces (id) on delete cascade,
    created_by_id uuid not null references users (id),
    parent_project_id uuid references projects (id) on delete cascade,
    title varchar(255) not null,
    description text not null,
    type varchar(64) not null,
    status varchar(64) not null,
    visibility varchar(64) not null,
    starts_at timestamp with time zone,
    due_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_projects_type check (type in ('PROJECT', 'EPIC')),
    constraint ck_projects_status check (status in ('BACKLOG', 'ACTIVE', 'PAUSED', 'DONE', 'ARCHIVED')),
    constraint ck_projects_visibility check (visibility in ('PRIVATE', 'PUBLIC')),
    constraint ck_projects_parent_for_epic check (
        (type = 'PROJECT' and parent_project_id is null)
        or (type = 'EPIC' and parent_project_id is not null)
    )
);

create index ix_projects_workspace_type on projects (workspace_id, type);
create index ix_projects_parent on projects (parent_project_id);

alter table tasks
    add column project_id uuid references projects (id) on delete set null,
    add column epic_id uuid references projects (id) on delete set null,
    add column parent_task_id uuid references tasks (id) on delete cascade,
    add column estimate_minutes integer;

create index ix_tasks_project on tasks (project_id);
create index ix_tasks_epic on tasks (epic_id);
create index ix_tasks_parent on tasks (parent_task_id);

alter table calendar_blocks drop constraint ck_calendar_blocks_source_type;
alter table calendar_blocks
    add constraint ck_calendar_blocks_source_type check (source_type in ('EVENT', 'TASK', 'PROJECT'));

create table resource_shares (
    id uuid primary key,
    resource_type varchar(64) not null,
    resource_id uuid not null,
    owner_workspace_id uuid not null references workspaces (id) on delete cascade,
    requested_by_id uuid not null references users (id),
    recipient_id uuid not null references users (id),
    access_level varchar(64) not null,
    status varchar(64) not null,
    message text not null,
    decided_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_resource_shares_type check (resource_type in ('EVENT', 'TASK', 'PROJECT')),
    constraint ck_resource_shares_access check (access_level in ('READ', 'WRITE')),
    constraint ck_resource_shares_status check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'))
);

create index ix_resource_shares_recipient_status on resource_shares (recipient_id, status);
create index ix_resource_shares_resource on resource_shares (resource_type, resource_id);

create table attachments (
    id uuid primary key,
    workspace_id uuid not null references workspaces (id) on delete cascade,
    uploaded_by_id uuid not null references users (id),
    resource_type varchar(64) not null,
    resource_id uuid not null,
    original_filename varchar(512) not null,
    content_type varchar(255) not null,
    size_bytes bigint not null,
    storage_key varchar(1024) not null,
    checksum_sha256 varchar(128),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_attachments_type check (resource_type in ('EVENT', 'TASK', 'PROJECT')),
    constraint ck_attachments_size check (size_bytes > 0)
);

create index ix_attachments_resource on attachments (resource_type, resource_id);
create index ix_attachments_workspace on attachments (workspace_id);
