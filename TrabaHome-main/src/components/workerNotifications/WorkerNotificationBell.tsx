import React from "react";
import RoleNotificationBell from "../notifications/RoleNotificationBell.tsx";

const WorkerNotificationBell: React.FC = () => (
  <RoleNotificationBell role="worker" seeAllPath="/worker-notifications" />
);

export default WorkerNotificationBell;
