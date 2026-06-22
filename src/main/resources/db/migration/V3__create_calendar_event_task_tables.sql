create table events (
    id uuid primary key,
    workspace_id uuid not null references workspaces (id) on delete cascade,
    created_by_id uuid not null references users (id),
    title varchar(255) not null,
    description text not null,
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    timezone varchar(64) not null,
    visibility varchar(64) not null,
    status varchar(64) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_events_visibility check (visibility in ('PRIVATE', 'PUBLIC')),
    constraint ck_events_status check (status in ('CONFIRMED', 'TENTATIVE', 'CANCELLED')),
    constraint ck_events_time_range check (ends_at > starts_at)
);

create index ix_events_workspace_time on events (workspace_id, starts_at, ends_at);

create table tasks (
    id uuid primary key,
    workspace_id uuid not null references workspaces (id) on delete cascade,
    created_by_id uuid not null references users (id),
    title varchar(255) not null,
    description text not null,
    status varchar(64) not null,
    priority varchar(64) not null,
    visibility varchar(64) not null,
    due_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_tasks_status check (status in ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED')),
    constraint ck_tasks_priority check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    constraint ck_tasks_visibility check (visibility in ('PRIVATE', 'PUBLIC'))
);

create index ix_tasks_workspace_status on tasks (workspace_id, status);
create index ix_tasks_workspace_due_at on tasks (workspace_id, due_at);

create table calendar_blocks (
    id uuid primary key,
    workspace_id uuid not null references workspaces (id) on delete cascade,
    title varchar(255) not null,
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    timezone varchar(64) not null,
    source_type varchar(64) not null,
    source_id uuid not null,
    visibility varchar(64) not null,
    busy boolean not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_calendar_blocks_time_range check (ends_at > starts_at),
    constraint ck_calendar_blocks_source_type check (source_type in ('EVENT', 'TASK')),
    constraint ck_calendar_blocks_visibility check (visibility in ('PRIVATE', 'PUBLIC'))
);

create index ix_calendar_blocks_workspace_time on calendar_blocks (workspace_id, starts_at, ends_at);
create index ix_calendar_blocks_source on calendar_blocks (source_type, source_id);
