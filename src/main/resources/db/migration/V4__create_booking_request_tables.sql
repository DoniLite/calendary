create table booking_requests (
    id uuid primary key,
    workspace_id uuid not null references workspaces (id) on delete cascade,
    requester_name varchar(255) not null,
    requester_email varchar(320) not null,
    message text not null,
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    timezone varchar(64) not null,
    status varchar(64) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_booking_requests_status check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
    constraint ck_booking_requests_time_range check (ends_at > starts_at)
);

create index ix_booking_requests_workspace_status on booking_requests (workspace_id, status);
create index ix_booking_requests_workspace_time on booking_requests (workspace_id, starts_at, ends_at);
