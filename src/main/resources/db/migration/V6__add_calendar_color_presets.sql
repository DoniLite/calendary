alter table events
    add column color_preset varchar(64) not null default 'BLUE';

alter table tasks
    add column color_preset varchar(64) not null default 'GREEN';

alter table projects
    add column color_preset varchar(64) not null default 'ORANGE';

alter table calendar_blocks
    add column color_preset varchar(64) not null default 'BLUE';

alter table events
    add constraint ck_events_color_preset check (color_preset in ('ORANGE', 'BLUE', 'GREEN', 'ROSE', 'VIOLET', 'SLATE', 'AMBER'));

alter table tasks
    add constraint ck_tasks_color_preset check (color_preset in ('ORANGE', 'BLUE', 'GREEN', 'ROSE', 'VIOLET', 'SLATE', 'AMBER'));

alter table projects
    add constraint ck_projects_color_preset check (color_preset in ('ORANGE', 'BLUE', 'GREEN', 'ROSE', 'VIOLET', 'SLATE', 'AMBER'));

alter table calendar_blocks
    add constraint ck_calendar_blocks_color_preset check (color_preset in ('ORANGE', 'BLUE', 'GREEN', 'ROSE', 'VIOLET', 'SLATE', 'AMBER'));
