alter table booking_requests
    add column conference_url varchar(2048),
    add column external_calendar_event_id varchar(512);

alter table events
    add column conference_url varchar(2048),
    add column external_calendar_event_id varchar(512);
