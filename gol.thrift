
typedef binary Chunk;
typedef string Quadkey;
typedef i32 Generation;

service Gol {

    void ping()

    Chunk getChunk(1: Generation generation, 2: Quadkey quadkey)
    void setChunk(1: Generation generation, 2: Quadkey quadkey, 2: Chunk chunk)

    Generation getProgress()
    void informProgress(1: i32 begin, 2: i32 end, 3: Generation generation)

}
