registerExercise({
  name: "Routing Basics",
  devices: () => ({
    R1: createDevice("router", 150, 150, "R1"),
    R2: createDevice("router", 400, 150, "R2")
  }),
  links: [["R1", "R2"]],
  tasks: [
    {
      description: "Configure IP on R1 and enable interface",
      check: (d) => d["R1"].interfaces["Gig0/0"].ip && d["R1"].interfaces["Gig0/0"].up
    },
    {
      description: "Configure IP on R2 and enable interface",
      check: (d) => d["R2"].interfaces["Gig0/0"].ip && d["R2"].interfaces["Gig0/0"].up
    }
  ]
});
