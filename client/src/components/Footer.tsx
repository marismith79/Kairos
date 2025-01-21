import { Button } from "../components/ui/button";
import { Home, User, Info } from "lucide-react";
import React from "react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer>
      <nav>
        <Link href="/about">
          <Button>
            <Info />
            About
          </Button>
        </Link>
        <Link href="/chat">
        <Button>
            Chat
          </Button>
        </Link>

      </nav>
    </footer>
  );
}
