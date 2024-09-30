import { Script } from './script.ts';

Deno.test('Script execution with context', () => {
    const player = {
        name: 'Alice',
        health: 100,
        takeDamage(amount: number) {
            this.health -= amount;
            console.log(`${this.name} took ${amount} damage. Health: ${this.health}`);
        }
    };

    const world = {
        name: 'Wonderland',
        difficulty: 'hard'
    };

    const context = {
        player,
        world,
        console
    };

    const script = `
        console.log('Hello from ' + player.name + ' in ' + world.name);
        if (world.difficulty === 'hard') {
            player.takeDamage(20);
        } else {
            player.takeDamage(10);
        }
    `;

    Script.executeWithContext(script, context);

    // Assertions to verify the script executed correctly
    if (player.health !== 80) {
        throw new Error(`Expected player health to be 80, but got ${player.health}`);
    }
});
