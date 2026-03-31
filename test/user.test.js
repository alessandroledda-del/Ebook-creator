const mongoose = require('mongoose');
const User = require('../models/user');

describe('User Model', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI);
    });

    it('should create a user', async () => {
        const user = await User.create({
            nome: 'Test',
            email: 'test@test.com',
            password: 'password123'
        });
        expect(user.nome).toBe('Test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });
});
