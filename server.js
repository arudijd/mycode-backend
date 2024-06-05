'use strict';

const Hapi = require('@hapi/hapi');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcryptjs = require('bcryptjs');
const jwt = require('@hapi/jwt');

const validate = async (decoded, request, h) => {
    const user = await prisma.user.findUnique({
        where: {
            id: decoded.userId
        }
    });

    if (!user) {
        return { isValid: false }
    }

    return { isValid: true, credentials: { userId: user.id, email: user.email } }
}

const createCustomUserId = async () => {
    const lastUser = await prisma.user.findMany({
        orderBy: {
            id: 'desc'
        },
        take: 1,
    });

    if (lastUser.length === 0) {
        return 'USR001';
    }

    const lastId = lastUser[0].id;
    const numericPart = parseInt(lastId.replace('USR', '')) + 1;
    const newUserId = 'USR' + numericPart.toString().padStart(3, '0');

    return newUserId;
}

function exclude(user, keys) {
    return Object.fromEntries(
      Object.entries(user).filter(([key]) => !keys.includes(key))
    );
}

const init = async () => {
    const server = Hapi.server({
        host: 'localhost',
        port: 1234
    });

    // await server.register(jwt);

    // server.auth.strategy('jwt', 'jwt', {
    //     keys: process.env.JWT_SECRET,
    //     validate,
    //     verify: {
            
    //     }
    // });


    // server.auth.default('jwt');

    server.route({
        method: 'POST',
        path: '/register',
        handler: async (request, h) => {
            try {
                const { email, name, password } = request.payload;
                const hashedPassword = await bcryptjs.hash(password, 10);
                const newId = await createCustomUserId()
                const user = await prisma.user.create({
                    data: {
                        id: newId,
                        email,
                        name,
                        password: hashedPassword
                    }
                });

                return h.response({
                    status: 201,
                    message: 'User berhasil dibuat!',
                    data: user
                }).code(201);

                // return await createCustomUserId();
            } catch (error) {
                console.log(error);
            }
        }
    })

    server.route({
        method: 'DELETE',
        path: '/users/{id}',
        handler: async (request, h) => {
            const data = await prisma.user.delete({
                where: {
                    id: request.params.id
                }
            })

            return h.response({
                status: 201,
                messsage: 'Data berhasil dihapus',
                data: data
            }).code(201);
        }
    })

    server.route({
        method: 'GET',
        path: '/users',
        handler: async (request, h) => {
            const data = await prisma.user.findMany({});
            const response = data.map(d => exclude(d, ['password']))

            return h.response({
                message: 'Data semua user!',
                data: response
            }).code(200);
        }
    })

    server.route({
        method: 'GET',
        path: '/users/{id}',
        handler: async (request, h) => {
            const data = await prisma.user.findUnique({
                where: {
                    id: request.params.id
                }
            });

            const user = exclude(data, ['password']);

            const posts = await prisma.post.findMany({
                where: {
                    authorId: request.params.id
                }
            });

            const response = {
                ...user,
                posts
            }
            
            if (response) {
                return {
                    status: 200,
                    message: 'Data ditemukan!',
                    data: response
                }
            } else {
                return {
                    status: 200,
                    message: "Data tidak ada!"
                }
            }
        }
    })

    server.route({
        method: 'GET',
        path: '/posts',
        handler: async (request, h) => {
            const response = await prisma.post.findMany();
            return {
                status: 200,
                data: response
            }
        }
    })

    server.route({
        method: 'GET',
        path: '/posts/{id}',
        handler: async (request, h) => {
            const response = await prisma.post.findUnique({
                where: {
                    id: request.params.id
                }
            })

            if (response) {
                return {
                    status: 200,
                    message: 'Data ditemukan',
                    data: response
                }
            } else {
                return {
                    status: 200,
                    message: 'Data tidak ditemukan'
                }
            }
        }
    })

    await server.start();
    console.log(`Server started on : ${server.info.uri}`);
}

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
})

init();