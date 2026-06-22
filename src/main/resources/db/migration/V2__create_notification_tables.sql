create table notifications (
    id uuid primary key,
    type varchar(64) not null,
    title varchar(255) not null,
    body text not null,
    resource_type varchar(64),
    resource_id uuid,
    action_url varchar(512),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_notifications_type check (
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
            'RESOURCE_UPDATED'
        )
    )
);

create table notification_deliveries (
    id uuid primary key,
    notification_id uuid not null references notifications (id) on delete cascade,
    recipient_id uuid not null references users (id) on delete cascade,
    read_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index ix_notification_deliveries_recipient_created_at
    on notification_deliveries (recipient_id, created_at desc);

create index ix_notification_deliveries_recipient_read_at
    on notification_deliveries (recipient_id, read_at);
