import {
  IconBox,
  IconCloud,
  IconContainer,
  IconCpu,
  IconFlask,
  IconLayersIntersect,
  IconRocket,
  IconServer,
  type Icon,
} from "@tabler/icons-react";

export const WORKSPACE_ICON_MAP: Record<string, Icon> = {
  Boxes: IconBox,
  Server: IconServer,
  Cpu: IconCpu,
  Cloud: IconCloud,
  Rocket: IconRocket,
  FlaskConical: IconFlask,
  Layers: IconLayersIntersect,
  Container: IconContainer,
};

export function getWorkspaceIcon(name: string): Icon {
  return WORKSPACE_ICON_MAP[name] ?? IconBox;
}
