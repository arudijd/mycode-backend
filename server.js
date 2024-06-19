'use strict';

const Hapi = require('@hapi/hapi');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcryptjs = require('bcryptjs');
const jwt = require('@hapi/jwt');
const { verify } = require('jsonwebtoken');

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

const createCustomPostId = async () => {
    const lastPost = await prisma.post.findMany({
        orderBy: {
            id: 'desc'
        },
        take: 1
    })

    if (lastPost.length === 0) {
        return 'PST001';
    }

    const lastId = lastPost[0].id;
    const numericPart = parseInt(lastId.replace('PST', '')) + 1;
    const newPostId = 'PST' + numericPart.toString().padStart(3, '0');

    return newPostId;
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

    await server.register(jwt);

    server.auth.strategy('jwt', 'jwt', {
        keys: process.env.JWT_SECRET,
        verify: {
            aud: 'urn:audience:test',
            iss: 'urn:issuer:test',
            sub: false,
            nbf: true,
            exp: true,
            maxAgeSec: 14400, // 4 hours
            timeSkewSec: 15
        },
        validate: (artifacts, request, h) => {
            return {
              isValid: true,
              credentials: { user: artifacts.decoded.payload.user }
            };
        }
        // verify: false
    });


    server.auth.default('jwt');

    //Register
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
        },
        options: {
            auth: false
        }
    })

    //Login
    server.route({
        method: 'POST',
        path: '/login',
        handler: async (request, h) => {
            try {
                const { email, password } = request.payload;
                const user = await prisma.user.findUniqueOrThrow({
                    where: {
                        email
                    }
                });

                if (!user || !(await bcryptjs.compare(password, user.password))) {
                    return h.response({ error: 'Invalid email or password' }).code(401);
                }

                const token = jwt.token.generate(
                    {
                        aud: 'urn:audience:test',
                        iss: 'urn:issuer:test',
                        user: {
                            id: user.id,
                            email: user.email
                        }
                    },
                    {
                        key: process.env.JWT_SECRET,
                        algorithm: 'HS256'
                    },
                    {
                        ttlSec: 14400
                    }
                )

                return h.response({ token }).code(200);
                
            } catch (error) {
                
            }
        },
        options: {
            auth: false
        }
    })

    // Delete User
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
        },
        options: {
            auth: false
        }
    })

    //Get all users
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
        },
        options: {
            auth: false
        }
        
    })

    //Get User Detail
    server.route({
        method: 'GET',
        path: '/users/{id}',
        handler: async (request, h) => {
            const data = await prisma.user.findUnique({
                where: {
                    id: request.params.id
                },
                include: {
                    posts: true
                }
            });

            const user = exclude(data, ['password']);
            
            if (user) {
                return {
                    status: 200,
                    message: 'Data ditemukan!',
                    data: user
                }
            } else {
                return {
                    status: 200,
                    message: "Data tidak ada!"
                }
            }
        },
        options: {
            auth: false
        }
    })

    //Update user
    server.route({
        method: 'PUT',
        path: '/users/{id}',
        handler: async (request, h) => {
            const { id } = request.params;
            const { email, image, name, about, social_media } = request.payload;
            const user = await prisma.user.update({
                where: {
                    id
                },
                data: {
                    email,
                    image,
                    name,
                    about,
                    social_media
                }
            });

            return h.response({
                message: 'Data berhasil diubah',
                data
            });
        },
        options: {
            auth: false
        }
    });

    //Get all posts
    server.route({
        method: 'GET',
        path: '/posts',
        handler: async (request, h) => {
            const response = await prisma.post.findMany();
            return {
                status: 200,
                data: response
            }
        },
        options: {
            auth: false
        }
    })

    //Get detail post
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
    });

    //create post
    server.route({
        method: 'POST',
        path: '/posts',
        handler: async (request, h) => {
            const {title, image, content} = request.payload
            const data = await prisma.post.create({
                data: {
                    id: await createCustomPostId(),
                    title,
                    image,
                    content
                }
            });

            return h.response({
                message: 'Post berhasil dibuat',
                data
            })
        }
    });



    await server.start();
    console.log(`Server started on : ${server.info.uri}`);
}

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
})

init();