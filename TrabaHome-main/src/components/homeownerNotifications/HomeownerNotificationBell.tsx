import React from "react";
import RoleNotificationBell from "../notifications/RoleNotificationBell.tsx";

type HomeownerNotificationBellProps = {
  onOpen?: () => void;
};

const HomeownerNotificationBell: React.FC<HomeownerNotificationBellProps> = ({ onOpen }) => (
  <RoleNotificationBell
    role="homeowner"
    seeAllPath="/homeowner-notifications"
    onOpen={onOpen}
  />
);

export default HomeownerNotificationBell;
