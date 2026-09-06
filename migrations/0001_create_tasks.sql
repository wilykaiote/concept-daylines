-- Migration number: 0001 	 2026-09-06T19:02:08.396Z
CREATE TABLE IF NOT EXISTS tasks ( 
    id TEXT PRIMARY KEY, 
    usr_id TEXT NOT NULL,
    parent_id TEXT, 
    after_id TEXT, 
    type TEXT NOT NULL, 
    title TEXT NOT NULL, 
    description TEXT NOT NULL,
    est_duration INTEGER, 
    date_time TEXT, 
    urgency TEXT, 
    impact INTEGER NOT NULL, 
    recurring TEXT, 
    after TEXT, 
    location TEXT,
    tags TEXT,
    status TEXT NOT NULL, 
    created_at TEXT,
    completed_at TEXT, 
    FOREIGN KEY (parent_id) REFERENCES tasks(id), 
    FOREIGN KEY (after_id) REFERENCES tasks(id) 
);