| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/topics` | List all topics |
| POST | `/topics` | Create new topic |
| GET | `/topics/{name}` | Get topic details |
| PUT | `/topics/{name}` | Alter topic config |
| DELETE | `/topics/{name}` | Delete topic |

### ACLs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/acls` | List all ACLs |
| POST | `/acls` | Create ACL binding |
| DELETE | `/acls` | Delete ACL binding |

### Schemas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schemas/subjects` | List subjects |
| GET | `/schemas/subjects/{subject}` | Get schema versions |
| POST | `/schemas/subjects/{subject}` | Register schema |
| DELETE | `/schemas/subjects/{subject}` | Delete subject |


