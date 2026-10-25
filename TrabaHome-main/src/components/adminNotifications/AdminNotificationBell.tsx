import React from "react";
import RoleNotificationBell from "../notifications/RoleNotificationBell.tsx";

const AdminNotificationBell: React.FC = () => (
  <RoleNotificationBell role="admin" seeAllPath="/admin-notifications" />
);

export default AdminNotificationBell;
