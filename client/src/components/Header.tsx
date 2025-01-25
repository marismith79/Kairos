import "../App.css";
import { Button } from "../components/ui/button";
import { Link } from "wouter";

export function Header() {
  return (
    <header className="header-container" >
      <div className="Header1">
        <Link href="/home" className="company-name glimmer-text">
          <p>Kairos</p>
        </Link>
      </div>
      <div className="Header2">
        <nav className="nav">
        <Link href="/">
            <Button>
              Home
            </Button>
          </Link>
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
        </nav>
      </div>
    </header>
  );
}