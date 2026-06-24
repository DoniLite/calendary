alter table workspaces
    add column public_slug varchar(128),
    add column default_timezone varchar(64) not null default 'Europe/Paris';

update workspaces
set public_slug = 'workspace-' || substring(id::text, 1, 8)
where public_slug is null;

alter table workspaces
    alter column public_slug set not null;

create unique index uk_workspaces_public_slug_lower on workspaces (lower(public_slug));
