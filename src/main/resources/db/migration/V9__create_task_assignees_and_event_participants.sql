create table task_assignees (
    id uuid primary key,
    task_id uuid not null references tasks (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint uk_task_assignees_task_user unique (task_id, user_id)
);

create index ix_task_assignees_task_id on task_assignees (task_id);
create index ix_task_assignees_user_id on task_assignees (user_id);

create table event_participants (
    id uuid primary key,
    event_id uuid not null references events (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint uk_event_participants_event_user unique (event_id, user_id)
);

create index ix_event_participants_event_id on event_participants (event_id);
create index ix_event_participants_user_id on event_participants (user_id);

alter table notifications drop constraint ck_notifications_type;
alter table notifications
    add constraint ck_notifications_type check (
        type in (
            'INVITATION_CREATED',
            'INVITATION_ACCEPTED',
            'BOOKING_REQUESTED',
            'BOOKING_ACCEPTED',
            'BOOKING_REJECTED',
            'COLLABORATION_REQUESTED',
            'COLLABORATION_ACCEPTED',
            'COLLABORATION_REJECTED',
            'RESOURCE_SHARED',
            'RESOURCE_UPDATED',
            'TASK_ASSIGNED',
            'EVENT_PARTICIPANT_ADDED'
        )
    );
