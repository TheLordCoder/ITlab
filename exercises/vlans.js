registerExercise({
  name: "Basic VLAN Setup",
  devices: () => ({
    S1: createDevice("switch", 200, 150, "S1"),
    S2: createDevice("switch", 400, 150, "S2")
  }),
  links: [["S1", "S2"]],
  tasks: [
    {
      description: "Bring up interface Fa0/1 on S1",
      check: (d) => d["S1"].interfaces["Fa0/1"].up
    },
    {
      description: "Bring up interface Fa0/1 on S2",
      check: (d) => d["S2"].interfaces["Fa0/1"].up
    }
  ]
});
