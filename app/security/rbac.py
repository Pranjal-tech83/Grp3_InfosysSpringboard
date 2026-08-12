from enum import Enum
from typing import List, Optional

class Role(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    ADMIN = "ADMIN"

class Permission(str, Enum):
    # Employee Permissions
    VIEW_OWN_PROFILE = "VIEW_OWN_PROFILE"
    CREATE_TICKET = "CREATE_TICKET"
    VIEW_OWN_TICKETS = "VIEW_OWN_TICKETS"
    VIEW_OWN_TICKET_STATUS = "VIEW_OWN_TICKET_STATUS"
    VIEW_OWN_AI_RESOLUTION = "VIEW_OWN_AI_RESOLUTION"
    VIEW_OWN_ACTIVITY = "VIEW_OWN_ACTIVITY"
    UPDATE_OWN_PROFILE = "UPDATE_OWN_PROFILE"
    UPLOAD_OWN_PROFILE_IMAGE = "UPLOAD_OWN_PROFILE_IMAGE"
    
    # Admin Permissions
    ACCESS_ADMIN_DASHBOARD = "ACCESS_ADMIN_DASHBOARD"
    VIEW_ALL_TICKETS = "VIEW_ALL_TICKETS"
    RESOLVE_TICKETS = "RESOLVE_TICKETS"
    ESCALATE_TICKETS = "ESCALATE_TICKETS"
    ASSIGN_TICKETS = "ASSIGN_TICKETS"
    REASSIGN_TICKETS = "REASSIGN_TICKETS"
    RUN_AI_RESOLUTION = "RUN_AI_RESOLUTION"
    VIEW_ANALYTICS = "VIEW_ANALYTICS"
    MANAGE_USERS = "MANAGE_USERS"
    VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS"
    MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS"
    MANAGE_ADMIN_SETTINGS = "MANAGE_ADMIN_SETTINGS"

ROLE_PERMISSIONS = {
    Role.EMPLOYEE: [
        Permission.VIEW_OWN_PROFILE,
        Permission.CREATE_TICKET,
        Permission.VIEW_OWN_TICKETS,
        Permission.VIEW_OWN_TICKET_STATUS,
        Permission.VIEW_OWN_AI_RESOLUTION,
        Permission.VIEW_OWN_ACTIVITY,
        Permission.UPDATE_OWN_PROFILE,
        Permission.UPLOAD_OWN_PROFILE_IMAGE,
    ],
    Role.ADMIN: [
        Permission.ACCESS_ADMIN_DASHBOARD,
        Permission.VIEW_ALL_TICKETS,
        Permission.RESOLVE_TICKETS,
        Permission.ESCALATE_TICKETS,
        Permission.ASSIGN_TICKETS,
        Permission.REASSIGN_TICKETS,
        Permission.RUN_AI_RESOLUTION,
        Permission.VIEW_ANALYTICS,
        Permission.MANAGE_USERS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.MANAGE_INTEGRATIONS,
        Permission.MANAGE_ADMIN_SETTINGS,
        # Admins often have employee permissions too, but we keep roles separate to strictly enforce dashboards
    ]
}

def has_permission(user_role: str, permission: Permission) -> bool:
    try:
        role = Role(user_role.upper())
        return permission in ROLE_PERMISSIONS.get(role, [])
    except ValueError:
        return False

def verify_resource_ownership(requested_user_id: int, authenticated_user_id: int, role: str) -> bool:
    """
    Employees can only access their own resources.
    Admins can access everything.
    """
    if role.upper() == Role.ADMIN.value:
        return True
    return requested_user_id == authenticated_user_id
