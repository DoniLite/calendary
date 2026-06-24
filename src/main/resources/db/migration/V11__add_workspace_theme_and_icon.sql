alter table workspaces
    add column theme varchar(32) not null default 'solar-orange',
    add column icon_storage_key varchar(512);
