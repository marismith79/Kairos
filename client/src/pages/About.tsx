import * as React from "react"

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <section className="space-y-4 mb-12">
        <h1 className="text-4xl font-bold">About Us</h1>
        <p className="text-lg text-muted-foreground">
          We are committed to connecting individuals with mental health and substance abuse resources in their local communities.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-semibold">Our Mission</h2>
        <p className="text-muted-foreground">
          Our mission is to break down barriers to mental health and substance abuse treatment by providing easy access to nearby facilities and resources.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-semibold">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Accessibility</h3>
            <p className="text-sm text-muted-foreground">Making mental health resources available to everyone</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Compassion</h3>
            <p className="text-sm text-muted-foreground">Supporting individuals with empathy and understanding</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Innovation</h3>
            <p className="text-sm text-muted-foreground">Using technology to improve access to care</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Our Partners</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          Partner logo placeholders
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Partner Logo</span>
          </div>
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Partner Logo</span>
          </div>
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Partner Logo</span>
          </div>
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Partner Logo</span>
          </div>
        </div>
      </section>
    </div>
  );
}
