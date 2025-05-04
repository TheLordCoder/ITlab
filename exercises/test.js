registerExercise({
  name: "Basic Router-Switch Network",
  devices: () => ({
    R1: createDevice("router", 100, 150, "R1"),
    S1: createDevice("switch", 250, 150, "S1"),
    S2: createDevice("switch", 400, 150, "S2"),
    R2: createDevice("router", 550, 150, "R2")
  }),
  links: [["R1", "S1"], ["S1", "S2"], ["S2", "R2"]],
  tasks: [
    {
      description: "Configure IP on R1 Gig0/0 and bring it up",
      check: (d) => d["R1"].interfaces["Gig0/0"].ip && d["R1"].interfaces["Gig0/0"].up
    },
    {
      description: "Configure IP on R2 Gig0/0 and bring it up",
      check: (d) => d["R2"].interfaces["Gig0/0"].ip && d["R2"].interfaces["Gig0/0"].up
    }
  ]
});
