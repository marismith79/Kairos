import "../App.css";

import { Button } from "../components/ui/button";
import { Link } from "wouter";

export function Header() {
  return (
    <header>
      <nav>
        <Link href="/about">
          <Button>
            About
          </Button>
        </Link>
        <Link href="/chat">
        <Button>
            Chat
        </Button>
        </Link>
        <Link href="/home">
        <Button>
            Home
        </Button>
        </Link>
      </nav>
    </header>
  );
}
