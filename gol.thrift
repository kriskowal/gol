typedef i32 Generation
typedef string Quadkey
typedef binary Chunk

service Gol {
    void setChunk(
        1: Generation generation,
        2: Quadkey quadkey,
        3: Chunk chunk
    )
}
