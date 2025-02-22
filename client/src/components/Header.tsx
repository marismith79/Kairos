import "../App.css";
import { Button } from "../components/ui/button";
import { Link } from "wouter";

export function Header() {
  return (
    <header className="header-container" >
      <div className="Header1">
        <Link href="/" className="company-name glimmer-text justify-content">
          <h2>Kairos</h2>
        </Link>
      </div>
      <div className="Header2">
        <nav className="nav">
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
          <Link href="/sentichat">
            <Button>
              Sentiment Chat
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}