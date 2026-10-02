import { createFileRoute } from "@tanstack/react-router";
import { GameFlow } from "@/components/game/GameFlow";

export const Route = createFileRoute("/")({ component: GameFlow });
