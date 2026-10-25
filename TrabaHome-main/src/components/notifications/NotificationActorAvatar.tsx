import React, { useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import {
  resolveNotificationActor,
  type NotificationItem,
  type NotificationRole,
} from "../../services/notificationClient.ts";

type NotificationActorAvatarProps = {
  item: NotificationItem;
  role: NotificationRole;
  size?: "small" | "large";
};

const NotificationActorAvatar: React.FC<NotificationActorAvatarProps> = ({
  item,
  role,
  size = "small",
}) => {
  const actor = useMemo(() => resolveNotificationActor(role, item), [item, role]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [actor.avatar]);

  const dimensionClass = size === "large" ? "h-11 w-11" : "h-9 w-9";
  const iconClass = size === "large" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div
      className={`relative flex ${dimensionClass} shrink-0 items-center justify-center overflow-visible rounded-full border border-[#DCE6EF] bg-[#EEF3F8]`}
      title={actor.name || "Notification"}
    >
      {actor.avatar && !imageFailed ? (
        <img
          src={actor.avatar}
          alt={actor.name || "Notification user"}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <User className={`${iconClass} text-[#6B7F91]`} aria-hidden="true" />
      )}
      {!item.readAt && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
      )}
    </div>
  );
};

export default NotificationActorAvatar;
