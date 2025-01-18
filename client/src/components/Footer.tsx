import * as React from "react"
import { Button } from "../components/ui/button";
// import { Home, User, Info } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer>
      <nav>
        <Link href="/about">
          <Button>
            {/* <Home /> figure out how to make this a different icon*/}
            About
          </Button>
        </Link>
        <Link href="/facilities">
          <Button>
            Facilities
          </Button>
        </Link>
        <Link href="/profile">
          <Button>
            Profile
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
